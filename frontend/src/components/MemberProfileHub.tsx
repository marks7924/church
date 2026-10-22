'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, Lock, ShieldCheck, Mail, Phone, Calendar, Clock, MapPin, 
  CheckCircle2, AlertTriangle, X, Edit3, Send, QrCode, Users, 
  Sparkles, ExternalLink, RefreshCw, Key, Bell, Check, ChevronRight,
  HelpCircle, Eye, EyeOff, ShieldAlert, Camera, Upload, Trash2
} from 'lucide-react';
import VipInvitationCard from './VipInvitationCard';
import ImageCropModal from './ImageCropModal';
import { API_URL } from '../config';

interface MemberProfileHubProps {
  user: any;
  token: string;
  language: 'ar' | 'en';
  initialTab?: 'overview' | 'personal' | 'family' | 'passes' | 'appointments' | 'security';
  onProfileUpdated?: (updatedUser: any) => void;
  onNavigateTab?: (tabId: string) => void;
  onCancelPass?: (invitation: any) => void;
}

export default function MemberProfileHub({
  user: initialUser,
  token,
  language = 'ar',
  initialTab = 'overview',
  onProfileUpdated,
  onNavigateTab,
  onCancelPass
}: MemberProfileHubProps) {
  const isAr = language === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'personal' | 'family' | 'passes' | 'appointments' | 'security'>(initialTab);
  const [profileData, setProfileData] = useState<any>(initialUser || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Passes & Bookings state
  const [myPasses, setMyPasses] = useState<any[]>([]);
  const [passesFilter, setPassesFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED'>('ALL');
  const [viewingPassQr, setViewingPassQr] = useState<any | null>(null);
  const [myBookings, setMyBookings] = useState<any[]>([]);

  // Edit Profile Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>(initialUser?.fullName || '');
  const [editPhone, setEditPhone] = useState<string>(initialUser?.phone || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState<string>(initialUser?.avatarUrl || '');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  // Avatar Image Crop states
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Edit Profile Sub-tabs: 'info' | 'security'
  const [editModalTab, setEditModalTab] = useState<'info' | 'security'>('info');
  const [securityChangeType, setSecurityChangeType] = useState<'EMAIL' | 'PASSWORD'>('EMAIL');
  const [newEmailInput, setNewEmailInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [securityOtpInput, setSecurityOtpInput] = useState<string>('');
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [otpSentNotice, setOtpSentNotice] = useState<string | null>(null);
  const [isVerifyingSecurity, setIsVerifyingSecurity] = useState<boolean>(false);
  const [securityFeedback, setSecurityFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Correction Request Modal
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState<boolean>(false);
  const [correctionField, setCorrectionField] = useState<string>('nationalId');
  const [correctionRequestedValue, setCorrectionRequestedValue] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState<boolean>(false);
  const [correctionFeedback, setCorrectionFeedback] = useState<{ code?: string; message: string; type: 'success' | 'error' } | null>(null);

  // Notification Preferences State
  const [notificationPrefs, setNotificationPrefs] = useState<{ email: boolean; sms: boolean; events: boolean; reminders: boolean }>({
    email: true,
    sms: true,
    events: true,
    reminders: true
  });
  const [isSavingPrefs, setIsSavingPrefs] = useState<boolean>(false);

  // Load fresh profile, passes, and bookings
  const loadFreshData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Fetch fresh profile & canonical family membership
      const profileRes = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        const fresh = data.user || data;
        setProfileData(fresh);
        setEditFullName(fresh.fullName || '');
        setEditPhone(fresh.phone || '');
        setEditAvatarUrl(fresh.avatarUrl || '');
        if (fresh.notificationPreferences) {
          setNotificationPrefs(fresh.notificationPreferences);
        }
        if (onProfileUpdated) onProfileUpdated(fresh);
      }

      // 2. Fetch passes
      const passesRes = await fetch(`${API_URL}/invitations/my-invitations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (passesRes.ok) {
        const passesData = await passesRes.json();
        if (Array.isArray(passesData)) setMyPasses(passesData);
      }

      // 3. Fetch appointments
      const bookingsRes = await fetch(`${API_URL}/bookings/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        if (Array.isArray(bookingsData)) setMyBookings(bookingsData);
      }
    } catch (err) {
      console.error('Error fetching member profile hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFreshData();
  }, [token]);

  useEffect(() => {
    if (initialTab) setActiveSubTab(initialTab);
  }, [initialTab]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSavingProfile(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: editFullName,
          phone: editPhone,
          avatarUrl: editAvatarUrl
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(isAr ? (data.errorAr || data.error) : (data.error || 'Failed to update profile.'));
      }

      setSuccessMsg(isAr ? 'تم تحديث الملف الشخصي بنجاح!' : 'Profile updated successfully!');
      setIsEditModalOpen(false);
      await loadFreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Avatar Image Selection & Crop Handlers
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(isAr ? 'حجم الصورة يجب ألا يتجاوز 5 ميجابايت' : 'Image size must not exceed 5MB');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImageSrc(reader.result as string);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setEditAvatarUrl(croppedDataUrl);
    setIsCropModalOpen(false);
  };

  // Security OTP Handlers (Change Email / Password)
  const handleRequestSecurityOtp = async () => {
    if (!token) return;
    setIsSendingOtp(true);
    setSecurityFeedback(null);
    setOtpSentNotice(null);
    try {
      const res = await fetch(`${API_URL}/auth/profile/request-security-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type: securityChangeType })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSentNotice(isAr ? (data.messageAr || data.message) : data.message);
      } else {
        setSecurityFeedback({ message: data.errorAr || data.error || 'Failed to send OTP', type: 'error' });
      }
    } catch (err) {
      setSecurityFeedback({ message: isAr ? 'خطأ في الاتصال بالخادم' : 'Connection error', type: 'error' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifySecurityChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!securityOtpInput.trim()) {
      setSecurityFeedback({ message: isAr ? 'يرجى إدخال كود التحقق (OTP)' : 'Please enter OTP', type: 'error' });
      return;
    }
    if (securityChangeType === 'PASSWORD') {
      if (newPasswordInput.length < 8) {
        setSecurityFeedback({ message: isAr ? 'يجب ألا تقل كلمة المرور عن 8 أحرف' : 'Password must be at least 8 characters', type: 'error' });
        return;
      }
      if (newPasswordInput !== confirmPasswordInput) {
        setSecurityFeedback({ message: isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match', type: 'error' });
        return;
      }
    }
    if (securityChangeType === 'EMAIL' && !newEmailInput.trim()) {
      setSecurityFeedback({ message: isAr ? 'يرجى إدخال البريد الإلكتروني الجديد' : 'Please enter new email', type: 'error' });
      return;
    }

    setIsVerifyingSecurity(true);
    setSecurityFeedback(null);
    try {
      const res = await fetch(`${API_URL}/auth/profile/verify-security-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: securityChangeType,
          otp: securityOtpInput.trim(),
          newEmail: securityChangeType === 'EMAIL' ? newEmailInput.trim() : undefined,
          newPassword: securityChangeType === 'PASSWORD' ? newPasswordInput : undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSecurityFeedback({ message: isAr ? (data.messageAr || data.message) : data.message, type: 'success' });
        if (data.user) {
          setProfileData((prev: any) => ({ ...prev, ...data.user }));
          if (onProfileUpdated) onProfileUpdated(data.user);
        }
        if (data.accessToken && typeof window !== 'undefined') {
          localStorage.setItem('church-token', data.accessToken);
          if (data.refreshToken) localStorage.setItem('church-refresh-token', data.refreshToken);
        }
        setSecurityOtpInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        setNewEmailInput('');
        setOtpSentNotice(null);
        await loadFreshData();
      } else {
        setSecurityFeedback({ message: data.errorAr || data.error || 'Verification failed', type: 'error' });
      }
    } catch (err) {
      setSecurityFeedback({ message: isAr ? 'خطأ في الاتصال بالخادم' : 'Connection error', type: 'error' });
    } finally {
      setIsVerifyingSecurity(false);
    }
  };

  // Handle Correction Request Submission
  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmittingCorrection(true);
    setCorrectionFeedback(null);

    try {
      const res = await fetch(`${API_URL}/auth/request-identity-correction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fieldName: correctionField,
          requestedValue: correctionRequestedValue,
          reason: correctionReason
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(isAr ? (data.errorAr || data.error) : (data.error || 'Failed to submit correction request.'));
      }

      setCorrectionFeedback({
        type: 'success',
        code: data.referenceCode,
        message: isAr ? (data.messageAr || data.message) : data.message
      });
      setCorrectionRequestedValue('');
      setCorrectionReason('');
    } catch (err: any) {
      setCorrectionFeedback({
        type: 'error',
        message: err.message || 'Error submitting request.'
      });
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Save Notification Preferences
  const handleSaveNotificationPrefs = async (newPrefs: typeof notificationPrefs) => {
    setNotificationPrefs(newPrefs);
    if (!token) return;
    setIsSavingPrefs(true);
    try {
      await fetch(`${API_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          notificationPreferences: newPrefs
        })
      });
    } catch (err) {
      console.error('Error saving notification preferences:', err);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const u = profileData || initialUser || {};
  const derived = u.derivedIdentity || {};
  const family = u.familyMembership || {};
  const stats = u.stats || {};

  // Filtered Passes
  const filteredPasses = myPasses.filter(pass => {
    if (passesFilter === 'ALL') return true;
    if (passesFilter === 'ACTIVE') return pass.status === 'ACTIVE' || !pass.status;
    if (passesFilter === 'REDEEMED') return pass.status === 'REDEEMED';
    if (passesFilter === 'CANCELLED') return pass.status === 'CANCELLED' || pass.isEventCancelled;
    if (passesFilter === 'EXPIRED') return pass.status === 'EXPIRED';
    if (passesFilter === 'PENDING') return pass.status === 'PENDING';
    return true;
  });

  const getMembershipBadge = () => {
    const status = family.status || u.familyProfileStatus || (u.isChurchMember ? 'APPROVED' : 'NOT_SUBMITTED');
    switch (status) {
      case 'APPROVED':
        return {
          bg: 'rgba(46, 204, 113, 0.15)',
          color: '#2ecc71',
          border: '1px solid rgba(46, 204, 113, 0.4)',
          text: isAr ? 'عضوية معتمدة 🎖️' : 'Approved Member 🎖️',
          icon: <CheckCircle2 size={16} />
        };
      case 'PENDING':
        return {
          bg: 'rgba(226, 183, 20, 0.15)',
          color: '#e2b714',
          border: '1px solid rgba(226, 183, 20, 0.4)',
          text: isAr ? 'قيد المراجعة ⏳' : 'Pending Review ⏳',
          icon: <Clock size={16} />
        };
      case 'REJECTED':
        return {
          bg: 'rgba(231, 76, 60, 0.15)',
          color: '#e74c3c',
          border: '1px solid rgba(231, 76, 60, 0.4)',
          text: isAr ? 'يتطلب تعديل ⚠️' : 'Action Required ⚠️',
          icon: <AlertTriangle size={16} />
        };
      default:
        return {
          bg: 'rgba(149, 165, 166, 0.15)',
          color: '#95a5a6',
          border: '1px solid rgba(149, 165, 166, 0.3)',
          text: isAr ? 'غير مسجل' : 'Not Registered',
          icon: <HelpCircle size={16} />
        };
    }
  };

  const badge = getMembershipBadge();

  // Format member since date
  const memberSinceFormatted = u.memberSince || u.createdAt
    ? new Date(u.memberSince || u.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long'
      })
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', direction: isAr ? 'rtl' : 'ltr' }}>
      
      {/* ======================================================== */}
      {/* 1. HERO PROFILE OVERVIEW BANNER                          */}
      {/* ======================================================== */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(25, 27, 36, 0.95) 0%, rgba(18, 19, 25, 0.95) 100%)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '1.75rem',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative gold ambient glow */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: isAr ? '-60px' : 'auto',
          left: isAr ? 'auto' : '-60px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(226, 183, 20, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            {/* Avatar / Initials */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(226, 183, 20, 0.1)',
              border: '2px solid var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              color: 'var(--accent-gold)',
              fontWeight: 800,
              overflow: 'hidden',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
              flexShrink: 0
            }}>
              {u.avatarUrl ? (
                <img src={u.avatarUrl} alt={u.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                u.fullName ? u.fullName.trim()[0].toUpperCase() : '👤'
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {u.fullName || (isAr ? 'عضو كنيسة الشهيد أبي سيفين' : 'Church Member')}
                </h2>

                {/* Role Pill */}
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(226, 183, 20, 0.15)',
                  color: 'var(--accent-gold)',
                  border: '1px solid rgba(226, 183, 20, 0.3)'
                }}>
                  {u.role || 'MEMBER'}
                </span>

                {/* Canonical Membership Status Badge */}
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: badge.bg,
                  color: badge.color,
                  border: badge.border
                }}>
                  {badge.icon}
                  {badge.text}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} style={{ color: 'var(--accent-gold)' }} />
                  {u.email}
                </span>
                {u.phone && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} style={{ color: 'var(--accent-gold)' }} />
                    {u.phone}
                  </span>
                )}
                {memberSinceFormatted && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} style={{ color: 'var(--accent-gold)' }} />
                    {isAr ? `تاريخ الانضمام: ${memberSinceFormatted}` : `Member since: ${memberSinceFormatted}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Edit Profile Action */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsEditModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: 'rgba(226, 183, 20, 0.12)',
                color: 'var(--accent-gold)',
                border: '1px solid rgba(226, 183, 20, 0.35)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Edit3 size={16} />
              {isAr ? 'تعديل الملف الشخصي' : 'Edit Profile'}
            </button>

            <button
              onClick={loadFreshData}
              title={isAr ? 'تحديث البيانات' : 'Refresh'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Real Data Statistics Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginTop: '1.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {/* Confession Appointments Card */}
          <div 
            onClick={() => setActiveSubTab('appointments')}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '12px 16px',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
              {isAr ? 'مواعيد الاعتراف والمقابلات' : 'Upcoming Appointments'}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <strong style={{ fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                {myBookings.length}
              </strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-gold)' }}>
                {isAr ? 'موعد مسجل' : 'session(s)'}
              </span>
            </div>
          </div>

          {/* Active Event Passes */}
          <div 
            onClick={() => setActiveSubTab('passes')}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '12px 16px',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
              {isAr ? 'تذاكر ودعوات الفعاليات (QR)' : 'Active Event Passes'}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <strong style={{ fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                {myPasses.filter(p => p.status === 'ACTIVE' || !p.status).length}
              </strong>
              <span style={{ fontSize: '0.78rem', color: '#2ecc71' }}>
                {isAr ? 'تصريح ساري' : 'active pass(es)'}
              </span>
            </div>
          </div>

          {/* Family Membership Status */}
          <div 
            onClick={() => setActiveSubTab('family')}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '12px 16px',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
              {isAr ? 'عضوية الأسرة الكنسية' : 'Family Membership'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <strong style={{ fontSize: '1rem', color: badge.color, fontWeight: 700 }}>
                {family.hasMembership 
                  ? (isAr 
                      ? (family.status === 'APPROVED' ? 'معتمدة وموثقة 🎖️' : family.status === 'PENDING' ? 'قيد المراجعة ⏳' : 'يتطلب تصحيح ⚠️')
                      : family.status)
                  : (isAr ? 'غير مسجل' : 'Not Registered')}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Global feedback messages */}
      {successMsg && (
        <div style={{ background: 'rgba(46, 204, 113, 0.15)', border: '1px solid #2ecc71', color: '#2ecc71', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', color: '#2ecc71', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: 'rgba(231, 76, 60, 0.15)', border: '1px solid #e74c3c', color: '#e74c3c', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SUB-TABS NAVIGATION BAR                               */}
      {/* ======================================================== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '4px'
      }}>
        {[
          { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview', icon: <Sparkles size={16} /> },
          { id: 'personal', labelAr: 'البيانات الشخصية والهوية 🔒', labelEn: 'Personal Info & Identity 🔒', icon: <User size={16} /> },
          { id: 'family', labelAr: 'عضوية الأسرة الكنسية 👨‍👩‍👧‍👦', labelEn: 'Family Membership 👨‍👩‍👧‍👦', icon: <Users size={16} /> },
          { id: 'passes', labelAr: `تذاكري وتصاريحي (${myPasses.length})`, labelEn: `My Passes (${myPasses.length})`, icon: <QrCode size={16} /> },
          { id: 'appointments', labelAr: `مواعيد الاعتراف (${myBookings.length})`, labelEn: `Confessions (${myBookings.length})`, icon: <Calendar size={16} /> },
          { id: 'security', labelAr: 'الأمان والتفضيلات', labelEn: 'Security & Preferences', icon: <ShieldCheck size={16} /> }
        ].map(tab => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--accent-gold)' : '3px solid transparent',
                backgroundColor: isActive ? 'rgba(226, 183, 20, 0.1)' : 'transparent',
                color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.icon}
              {isAr ? tab.labelAr : tab.labelEn}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 3. SUB-TAB: OVERVIEW                                     */}
      {/* ======================================================== */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Quick Action Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
            
            {/* Next Appointment Card */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--accent-gold)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} />
                  {isAr ? 'أقرب موعد اعتراف محجوز' : 'Next Confession Appointment'}
                </span>
                <button
                  onClick={() => setActiveSubTab('appointments')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  {isAr ? 'عرض الكل' : 'View All'}
                </button>
              </div>

              {myBookings.length > 0 ? (
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {myBookings[0].priest?.nameAr || myBookings[0].priest?.nameEn}
                  </h4>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    📅 {new Date(myBookings[0].date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')} — ⏰ {myBookings[0].timeSlot}
                  </p>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: myBookings[0].status === 'APPROVED' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(226, 183, 20, 0.15)',
                    color: myBookings[0].status === 'APPROVED' ? '#2ecc71' : 'var(--accent-gold)',
                    fontWeight: 700
                  }}>
                    {myBookings[0].status}
                  </span>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                    {isAr ? 'لا توجد مواعيد اعتراف محجوزة حالياً.' : 'No upcoming appointments scheduled.'}
                  </p>
                  <button
                    onClick={() => { window.location.href = '/#priest-section'; }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(226, 183, 20, 0.1)',
                      border: '1px solid rgba(226, 183, 20, 0.3)',
                      color: 'var(--accent-gold)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isAr ? 'حجز موعد جديد ⛪' : 'Book Session ⛪'}
                  </button>
                </div>
              )}
            </div>

            {/* Next Active Event Pass */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', color: '#2ecc71', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <QrCode size={15} />
                  {isAr ? 'أحدث تصريح فعالية نشط' : 'Latest Event Pass'}
                </span>
                <button
                  onClick={() => setActiveSubTab('passes')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  {isAr ? 'عرض الكل' : 'View All'}
                </button>
              </div>

              {myPasses.filter(p => p.status === 'ACTIVE' || !p.status).length > 0 ? (
                (() => {
                  const pass = myPasses.filter(p => p.status === 'ACTIVE' || !p.status)[0];
                  return (
                    <div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {isAr ? (pass.event?.titleAr || pass.event?.titleEn) : (pass.event?.titleEn || pass.event?.titleAr)}
                      </h4>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        📍 {isAr ? (pass.location?.nameAr || pass.location?.nameEn) : (pass.location?.nameEn || pass.location?.nameAr)}
                      </p>
                      <button
                        onClick={() => setViewingPassQr(pass)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(46, 204, 113, 0.15)',
                          border: '1px solid rgba(46, 204, 113, 0.4)',
                          color: '#2ecc71',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <QrCode size={14} />
                        {isAr ? 'عرض الباركود' : 'View QR'}
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                    {isAr ? 'لا توجد تصاريح أو بطاقات فعاليات حالية.' : 'No active event passes.'}
                  </p>
                  <a
                    href="/events"
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-block'
                    }}
                  >
                    {isAr ? 'تصفح الفعاليات والرحلات 🚌' : 'Browse Events 🚌'}
                  </a>
                </div>
              )}
            </div>

            {/* Canonical Family Coverage Summary */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--accent-gold)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} />
                  {isAr ? 'العضوية الكنسية للأسرة' : 'Family Membership'}
                </span>
                <button
                  onClick={() => setActiveSubTab('family')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  {isAr ? 'التفاصيل' : 'Details'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: badge.color, fontWeight: 700 }}>
                  {badge.text}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                {family.hasMembership
                  ? (isAr 
                      ? `أنت مسجل ضمن عائلة: ${family.headFullName || 'الأسرة'}. العضوية تغطي جميع أفراد العائلة المعتمدين.`
                      : `Registered under family of ${family.headFullName || 'Head'}. Covers all family members.`)
                  : (isAr ? 'سجل استمارة أسرتك لربط جميع أفراد العائلة بسجلات الكنيسة.' : 'Register your family membership profile.')}
              </p>
            </div>
          </div>

          {/* Quick Pastoral Links */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--accent-gold)', margin: '0 0 1rem 0' }}>
              ⛪ {isAr ? 'الخدمات والروابط السريعة' : 'Quick Pastoral Links'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <a href="/fy/bible" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                <span>📖</span>
                <span>{isAr ? 'الكتاب المقدس وخطة القراءة' : 'Holy Bible & Reading Plan'}</span>
              </a>
              <a href="/sermons" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                <span>🎙️</span>
                <span>{isAr ? 'عظات الآباء والدروس' : 'Sermons & Spiritual Talks'}</span>
              </a>
              <a href="/#trips-section" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                <span>🚌</span>
                <span>{isAr ? 'رحلات وفعاليات الكنيسة' : 'Church Trips & Events'}</span>
              </a>
              <a href="/fy/questions" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                <span>❓</span>
                <span>{isAr ? 'أسئلة الشباب والإيمان (FY)' : 'Faith & Youth Questions'}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. SUB-TAB: PERSONAL INFO & DERIVED IDENTITY (LOCKED)   */}
      {/* ======================================================== */}
      {activeSubTab === 'personal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Editable Fields Section */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: '0 0 4px 0', fontWeight: 700 }}>
                  👤 {isAr ? 'البيانات الشخصية القابلة للتعديل' : 'Editable Personal Information'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {isAr ? 'يمكنك تحديث اسم العرض ورقم الهاتف واللغة من هنا مباشرة' : 'Update your display name, phone, and preferences'}
                </p>
              </div>

              <button
                onClick={() => setIsEditModalOpen(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent-gold)',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {isAr ? 'تعديل البيانات' : 'Edit'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block' }}>{isAr ? 'الاسم الكامل:' : 'Full Name:'}</span>
                <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>{u.fullName || '—'}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block' }}>{isAr ? 'البريد الإلكتروني:' : 'Email Address:'}</span>
                <strong style={{ fontSize: '0.95rem', color: '#ffffff', wordBreak: 'break-all' }}>{u.email || '—'}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block' }}>{isAr ? 'رقم الهاتف المحمول:' : 'Mobile Phone:'}</span>
                <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>{u.phone || (isAr ? 'غير مسجل' : 'Not set')}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block' }}>{isAr ? 'لغة الواجهة المفضلة:' : 'Preferred Language:'}</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--accent-gold)' }}>{u.language === 'en' ? 'English' : 'العربية'}</strong>
              </div>
            </div>
          </div>

          {/* Locked Official Identity Fields Section */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(226, 183, 20, 0.3)', borderRadius: '14px', padding: '1.5rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-gold)', margin: '0 0 4px 0', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={18} />
                  {isAr ? 'بيانات الهوية الرسمية المقفلة (مستخرجة من الرقم القومي)' : 'Authoritative Identity Fields (Locked)'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {isAr 
                    ? 'هذه الحقول مستنبطة آلياً وموثقة رسمياً من الرقم القومي المصري لضمان دقة السجلات الرعوية' 
                    : 'Derived authoritatively from the Egyptian National ID for pastoral registry integrity.'}
                </p>
              </div>

              <button
                onClick={() => {
                  setCorrectionFeedback(null);
                  setIsCorrectionModalOpen(true);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(231, 76, 60, 0.15)',
                  border: '1px solid rgba(231, 76, 60, 0.4)',
                  color: '#ff6b6b',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <HelpCircle size={15} />
                {isAr ? 'طلب تصحيح بيانات مقفلة' : 'Request Correction'}
              </button>
            </div>

            {/* Locked Field Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              
              {/* National ID Card (Masked) */}
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px dashed rgba(226, 183, 20, 0.3)', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{isAr ? 'الرقم القومي (محمي):' : 'National ID (Masked):'}</span>
                  <Lock size={13} style={{ color: 'var(--accent-gold)' }} />
                </div>
                <strong style={{ fontSize: '1rem', color: '#ffffff', letterSpacing: '1px', fontFamily: 'monospace' }}>
                  {derived.maskedNationalId || u.maskedNationalId || (u.nationalId ? `${u.nationalId.slice(0, 4)}******${u.nationalId.slice(-4)}` : '—')}
                </strong>
              </div>

              {/* Date of Birth (Derived) */}
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px dashed rgba(226, 183, 20, 0.3)', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{isAr ? 'تاريخ الميلاد المحسوب:' : 'Derived Date of Birth:'}</span>
                  <Lock size={13} style={{ color: 'var(--accent-gold)' }} />
                </div>
                <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>
                  {derived.birthDateFormatted || (derived.dateOfBirth ? new Date(derived.dateOfBirth).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : (isAr ? 'مستخرج من الرقم القومي' : 'Derived from ID'))}
                </strong>
              </div>

              {/* Dynamic Age (Derived) */}
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px dashed rgba(226, 183, 20, 0.3)', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{isAr ? 'العمر الدقيق (ديناميكي):' : 'Calculated Dynamic Age:'}</span>
                  <Lock size={13} style={{ color: 'var(--accent-gold)' }} />
                </div>
                <strong style={{ fontSize: '1rem', color: 'var(--accent-gold)', fontWeight: 800 }}>
                  {derived.age !== null && derived.age !== undefined 
                    ? `${derived.age} ${isAr ? 'سنة' : 'years'}` 
                    : '—'}
                </strong>
              </div>

              {/* Gender (Derived) */}
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px dashed rgba(226, 183, 20, 0.3)', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{isAr ? 'النوع (مستخرج):' : 'Derived Gender:'}</span>
                  <Lock size={13} style={{ color: 'var(--accent-gold)' }} />
                </div>
                <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>
                  {isAr ? (derived.genderAr || (derived.gender === 'FEMALE' ? 'أنثى' : 'ذكر')) : (derived.genderEn || derived.gender || '—')}
                </strong>
              </div>
            </div>

            {/* Explanation Note */}
            <div style={{ marginTop: '1rem', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(226, 183, 20, 0.06)', border: '1px solid rgba(226, 183, 20, 0.15)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={18} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                {isAr
                  ? '🔒 تنبيه أمني: لا يمكن تعديل الرقم القومي أو تاريخ الميلاد أو العمر أو النوع يدوياً للحفاظ على سلامة القيود الكنسية وتأكيد شروط الفعاليات. في حال وجود خطأ مطبعي في بياناتك، يرجى النقر على زر "طلب تصحيح بيانات مقفلة" لإرسال طلب رسمي للأمانة.'
                  : '🔒 Security notice: National ID, Date of birth, Age, and Gender are locked to maintain pastoral registry consistency. To fix a typo, submit an official correction request.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. SUB-TAB: FAMILY MEMBERSHIP (CRITICAL BUSINESS RULE)    */}
      {/* ======================================================== */}
      {activeSubTab === 'family' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Canonical Status Banner */}
          <div style={{
            background: family.status === 'APPROVED'
              ? 'rgba(46, 204, 113, 0.08)'
              : family.status === 'PENDING'
                ? 'rgba(226, 183, 20, 0.08)'
                : family.status === 'REJECTED'
                  ? 'rgba(231, 76, 60, 0.08)'
                  : 'rgba(255, 255, 255, 0.03)',
            border: family.status === 'APPROVED'
              ? '1.5px solid #2ecc71'
              : family.status === 'PENDING'
                ? '1.5px solid var(--accent-gold)'
                : family.status === 'REJECTED'
                  ? '1.5px solid #e74c3c'
                  : '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              {badge.icon}
              <div>
                <h3 style={{ fontSize: '1.2rem', color: badge.color, margin: '0 0 2px 0', fontWeight: 800 }}>
                  {family.status === 'APPROVED' 
                    ? (isAr ? 'عضوية كنسية معتمدة ورسمية للأسرة 🎖️' : 'Officially Approved Family Church Membership 🎖️')
                    : family.status === 'PENDING'
                      ? (isAr ? 'استمارة عضوية الأسرة قيد المراجعة والتدقيق ⏳' : 'Family Membership Pending Administrative Review ⏳')
                      : family.status === 'REJECTED'
                        ? (isAr ? 'حالة الطلب: يتطلب مراجعة وتصحيح البيانات ⚠️' : 'Membership Application Deferred / Needs Correction ⚠️')
                        : (isAr ? 'لم يتم تقديم استمارة العضوية الكنسية بعد' : 'No Family Membership Application Submitted')}
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {isAr 
                    ? `صفة الحساب في ملف الأسرة: ${family.relationshipToHead === 'PRIMARY_HEAD' ? 'رب الأسرة (صاحب الطلب الرئيسي)' : family.relationshipToHead === 'WIFE' ? 'الزوجة' : family.relationshipToHead === 'CHILD' ? 'ابن / ابنة' : family.relationshipToHead === 'RELATIVE' ? 'قريب مسجل' : 'عضو'}`
                    : `Your assigned relation: ${family.relationshipToHead || 'Member'}`}
                </span>
              </div>
            </div>

            {/* Critical Business Rule Banner */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '12px 16px',
              margin: '12px 0',
              fontSize: '0.86rem',
              color: '#ffffff',
              lineHeight: '1.6'
            }}>
              💡 <b>{isAr ? 'قاعدة العضوية الكنسية الموحدة:' : 'Unified Family Membership Policy:'}</b>{' '}
              {isAr
                ? 'ملف العضوية الكنسية المعتمد لرب الأسرة يغطي تلقائياً كامل أفراد الأسرة المسجلين بالاستمارة. لا يُطلب من أي فرد من أفراد الأسرة تقديم طلب عضوية مستقل، ويتمتع الجميع فورياً بكافة امتيازات العضوية الكنسية بمجرد اعتماد الاستمارة.'
                : 'A single approved family membership canonical record covers all assigned family members. Individual applications are not required.'}
            </div>

            {/* Rejection / Correction Feedback */}
            {family.status === 'REJECTED' && (
              <div style={{ background: 'rgba(231, 76, 60, 0.15)', border: '1px solid #e74c3c', borderRadius: '8px', padding: '12px 16px', margin: '12px 0' }}>
                <span style={{ fontSize: '0.82rem', color: '#ff8585', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  {isAr ? 'ملاحظات وتوجيهات أمانة الكنيسة:' : 'Secretary Review Feedback:'}
                </span>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#ffffff' }}>
                  {family.notes || (isAr ? 'يرجى مراجعة بيانات الأسرة وتصحيح الأرقام القومية وإعادة إرسال الاستمارة.' : 'Please verify details and resubmit.')}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ marginTop: '1rem' }}>
              {family.hasMembership ? (
                family.canEditApplication ? (
                  family.status === 'REJECTED' && (
                    <a
                      href="/register-member"
                      style={{
                        display: 'inline-block',
                        padding: '10px 20px',
                        backgroundColor: 'var(--accent-gold)',
                        color: '#000',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        borderRadius: '8px',
                        textDecoration: 'none'
                      }}
                    >
                      {isAr ? 'إعادة ملء وتصحيح استمارة الأسرة ✏️' : 'Resubmit Family Application ✏️'}
                    </a>
                  )
                ) : (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    ℹ️ {isAr ? 'تعديل أو إعادة إرسال الاستمارة مقتصر على رب الأسرة (صاحب الطلب الرئيسي).' : 'Only the primary applicant can edit this family application.'}
                  </p>
                )
              ) : (
                <a
                  href="/register-member"
                  style={{
                    display: 'inline-block',
                    padding: '10px 22px',
                    backgroundColor: 'var(--accent-gold)',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    textDecoration: 'none'
                  }}
                >
                  {isAr ? 'تقديم استمارة العضوية الكنسية للأسرة 📋' : 'Submit Family Membership 📋'}
                </a>
              )}
            </div>
          </div>

          {/* Permitted Family Details & Assigned Household Members */}
          {family.hasMembership && family.familyDetails && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-gold)', margin: '0 0 1rem 0', fontWeight: 800 }}>
                👨‍👩‍👧‍👦 {isAr ? 'أفراد الأسرة المشمولون بالعضوية' : 'Covered Household Members'} ({family.familyMembersCount})
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {/* Primary Head */}
                <div style={{ background: 'rgba(226, 183, 20, 0.05)', border: '1px solid rgba(226, 183, 20, 0.25)', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{family.headFullName}</strong>
                    <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(226, 183, 20, 0.15)', color: 'var(--accent-gold)', fontWeight: 700 }}>
                      {isAr ? 'رب الأسرة ⭐' : 'Head of Family ⭐'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {isAr ? 'الرقم القومي (محمي):' : 'National ID:'} {family.headMaskedNationalId}
                  </p>
                </div>

                {/* Wife */}
                {family.familyDetails.wife && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{family.familyDetails.wife.name}</strong>
                      <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(52, 152, 219, 0.15)', color: '#3498db', fontWeight: 700 }}>
                        {isAr ? 'الزوجة' : 'Wife'}
                      </span>
                    </div>
                    {family.familyDetails.wife.maskedNationalId && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {isAr ? 'الرقم القومي (محمي):' : 'National ID:'} {family.familyDetails.wife.maskedNationalId}
                      </p>
                    )}
                  </div>
                )}

                {/* Children */}
                {family.familyDetails.children.map((child: any, idx: number) => (
                  <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{child.name}</strong>
                      <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', fontWeight: 700 }}>
                        {isAr ? 'ابن / ابنة' : 'Child'}
                      </span>
                    </div>
                    {child.maskedNationalId && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {isAr ? 'الرقم القومي (محمي):' : 'National ID:'} {child.maskedNationalId}
                      </p>
                    )}
                    {child.educationOrJob && (
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {child.educationOrJob}
                      </p>
                    )}
                  </div>
                ))}

                {/* Relatives */}
                {family.familyDetails.relatives.map((rel: any, idx: number) => (
                  <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{rel.name}</strong>
                      <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(155, 89, 182, 0.15)', color: '#9b59b6', fontWeight: 700 }}>
                        {rel.relationshipType || (isAr ? 'قريب' : 'Relative')}
                      </span>
                    </div>
                    {rel.maskedNationalId && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {isAr ? 'الرقم القومي (محمي):' : 'National ID:'} {rel.maskedNationalId}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. SUB-TAB: MY PASSES & EVENT INVITATIONS (FILTERED)     */}
      {/* ======================================================== */}
      {activeSubTab === 'passes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Header & Filter Bar */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--accent-gold)', margin: '0 0 4px 0', fontWeight: 800 }}>
                  🎟️ {isAr ? 'تذاكر ودعوات الفعاليات الخاصة بي' : 'My Event Passes & Invitations'}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {isAr ? 'بطاقات الدخول المعتمدة للقداسات والنهضات والرحلات الكنسية' : 'Valid passes for liturgical services and church events'}
                </p>
              </div>

              <a
                href="/events"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(226, 183, 20, 0.15)',
                  border: '1px solid rgba(226, 183, 20, 0.35)',
                  color: 'var(--accent-gold)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                {isAr ? 'حجز تذكرة فعالية جديدة +' : 'Book New Pass +'}
              </a>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', labelAr: `الكل (${myPasses.length})`, labelEn: `All (${myPasses.length})` },
                { id: 'ACTIVE', labelAr: `سارية (${myPasses.filter(p => p.status === 'ACTIVE' || !p.status).length})`, labelEn: 'Active' },
                { id: 'REDEEMED', labelAr: `مستخدمة (${myPasses.filter(p => p.status === 'REDEEMED').length})`, labelEn: 'Used' },
                { id: 'PENDING', labelAr: `قيد المعالجة (${myPasses.filter(p => p.status === 'PENDING').length})`, labelEn: 'Pending' },
                { id: 'CANCELLED', labelAr: `ملغاة (${myPasses.filter(p => p.status === 'CANCELLED' || p.isEventCancelled).length})`, labelEn: 'Cancelled' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setPassesFilter(f.id as any)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: passesFilter === f.id ? '1px solid var(--accent-gold)' : '1px solid var(--border-color)',
                    backgroundColor: passesFilter === f.id ? 'rgba(226, 183, 20, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: passesFilter === f.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    fontWeight: passesFilter === f.id ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? f.labelAr : f.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Pass Cards Grid */}
          {filteredPasses.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
              {filteredPasses.map(pass => {
                const isVip = pass.type === 'VIP' || pass.isVip;
                const isCancelled = pass.status === 'CANCELLED' || pass.isEventCancelled;
                const isRedeemed = pass.status === 'REDEEMED';

                return (
                  <div
                    key={pass.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: isCancelled
                        ? '1px solid rgba(231, 76, 60, 0.5)'
                        : isVip
                          ? '1.5px solid var(--accent-gold)'
                          : '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                      position: 'relative'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                          {isAr ? (pass.event?.titleAr || pass.event?.titleEn) : (pass.event?.titleEn || pass.event?.titleAr)}
                        </h4>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: isVip ? 'rgba(226, 183, 20, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                          color: isVip ? 'var(--accent-gold)' : 'var(--text-secondary)',
                          border: isVip ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.1)'
                        }}>
                          {isVip ? (isAr ? '👑 كبار الزوار VIP' : '👑 VIP Pass') : (isAr ? '🎟️ تصريح عام' : '🎟️ Standard')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} style={{ color: 'var(--accent-gold)' }} />
                          {pass.event?.date ? new Date(pass.event.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : '—'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} style={{ color: 'var(--accent-gold)' }} />
                          {isAr ? (pass.location?.nameAr || pass.location?.nameEn) : (pass.location?.nameEn || pass.location?.nameAr)}
                        </span>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '10px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: isCancelled 
                          ? 'rgba(231, 76, 60, 0.15)' 
                          : isRedeemed 
                            ? 'rgba(149, 165, 166, 0.15)' 
                            : 'rgba(46, 204, 113, 0.15)',
                        color: isCancelled ? '#e74c3c' : isRedeemed ? '#95a5a6' : '#2ecc71'
                      }}>
                        {isCancelled 
                          ? (isAr ? 'ملغاة' : 'Cancelled') 
                          : isRedeemed 
                            ? (isAr ? 'تم الدخول بها' : 'Redeemed') 
                            : (isAr ? 'سارية للاستخدام' : 'Active')}
                      </span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setViewingPassQr(pass)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--accent-gold)',
                            color: '#000',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <QrCode size={14} />
                          {isAr ? 'عرض الباركود' : 'View Pass'}
                        </button>

                        {!isCancelled && !isRedeemed && onCancelPass && (
                          <button
                            onClick={() => onCancelPass(pass)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(231, 76, 60, 0.12)',
                              color: '#ff6b6b',
                              border: '1px solid rgba(231, 76, 60, 0.3)',
                              fontSize: '0.78rem',
                              cursor: 'pointer'
                            }}
                          >
                            {isAr ? 'إلغاء' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <QrCode size={40} style={{ color: 'var(--text-secondary)', marginBottom: '10px' }} />
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                {isAr ? 'لا توجد بطاقات مطابقة لفلتر البحث المحدد.' : 'No passes match the selected filter.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. SUB-TAB: CONFESSION APPOINTMENTS                      */}
      {/* ======================================================== */}
      {activeSubTab === 'appointments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--accent-gold)', margin: '0 0 4px 0', fontWeight: 800 }}>
                  📅 {isAr ? 'مواعيد سر الاعتراف والمقابلات الرعوية' : 'My Confession Appointments'}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {isAr ? 'سجل المواعيد المؤكدة وقيد الانتظار مع آباء الكنيسة ونيافة الأسقف' : 'Your scheduled pastoral and confession sessions'}
                </p>
              </div>

              <button
                onClick={() => { window.location.href = '/#priest-section'; }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(226, 183, 20, 0.15)',
                  border: '1px solid rgba(226, 183, 20, 0.35)',
                  color: 'var(--accent-gold)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isAr ? 'حجز موعد جديد +' : 'Book Session +'}
              </button>
            </div>

            {myBookings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myBookings.map(b => (
                  <div
                    key={b.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '1.2rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(226, 183, 20, 0.1)', border: '1px solid var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'var(--accent-gold)' }}>
                        ⛪
                      </div>
                      <div>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-primary)', display: 'block' }}>
                          {b.priest?.nameAr || b.priest?.nameEn}
                        </strong>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          📅 {new Date(b.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')} | ⏰ {b.timeSlot}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: b.status === 'APPROVED' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(226, 183, 20, 0.15)',
                        color: b.status === 'APPROVED' ? '#2ecc71' : 'var(--accent-gold)',
                        border: b.status === 'APPROVED' ? '1px solid rgba(46, 204, 113, 0.3)' : '1px solid rgba(226, 183, 20, 0.3)'
                      }}>
                        {b.status === 'APPROVED' ? (isAr ? 'مؤكد ومقبول ✓' : 'Confirmed') : (isAr ? 'قيد الانتظار ⏳' : 'Pending')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0', margin: 0, fontSize: '0.9rem' }}>
                {isAr ? 'لا توجد مواعيد اعتراف مسجلة حالياً.' : 'No confession appointments found.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. SUB-TAB: SECURITY & PREFERENCES                       */}
      {/* ======================================================== */}
      {activeSubTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Notification Preferences */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-gold)', margin: '0 0 1rem 0', fontWeight: 800 }}>
              🔔 {isAr ? 'تفضيلات الإشعارات والتنبيهات' : 'Notification Preferences'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { key: 'email', labelAr: 'إشعارات البريد الإلكتروني (تأكيد الحجوزات والمواعيد)', labelEn: 'Email Notifications', disabled: false },
                { key: 'sms', labelAr: 'رسائل SMS على الهاتف المسجل', labelEn: 'SMS Mobile Alerts', disabled: true },
                { key: 'events', labelAr: 'تنبيهات الفعاليات والرحلات الجديدة', labelEn: 'New Event Announcements', disabled: false },
                { key: 'reminders', labelAr: 'تذكير قبل موعد الفعالية أو الاعتراف بـ 24 ساعة', labelEn: '24-hour Event Reminders', disabled: false }
              ].map(item => (
                <label
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    opacity: item.disabled ? 0.5 : 1,
                    cursor: item.disabled ? 'not-allowed' : 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      disabled={item.disabled}
                      checked={item.disabled ? false : (notificationPrefs as any)[item.key]}
                      onChange={e => {
                        if (item.disabled) return;
                        const updated = { ...notificationPrefs, [item.key]: e.target.checked };
                        handleSaveNotificationPrefs(updated);
                      }}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)', cursor: item.disabled ? 'not-allowed' : 'pointer' }}
                    />
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {isAr ? item.labelAr : item.labelEn}
                    </span>
                  </div>
                  {item.disabled && (
                    <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(231, 76, 60, 0.15)', color: '#ff6b6b', border: '1px solid rgba(231, 76, 60, 0.3)', fontWeight: 600 }}>
                      {isAr ? 'معطّل مؤقتاً' : 'Temporarily Disabled'}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Account Security & Sessions */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-gold)', margin: '0 0 1rem 0', fontWeight: 800 }}>
              🛡️ {isAr ? 'أمان الجلسة وتسجيل الدخول' : 'Session & Security'}
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>
                  {isAr ? 'الجلسة الحالية النشطة' : 'Current Active Session'}
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {isAr ? 'جلسة مشفرة عبر رمز JWT آمن' : 'Authenticated via secure JWT token'}
                </span>
              </div>

              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('church-token');
                    localStorage.removeItem('church-refresh-token');
                    localStorage.removeItem('church-user');
                    window.location.href = '/login';
                  }
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(231, 76, 60, 0.15)',
                  border: '1px solid rgba(231, 76, 60, 0.4)',
                  color: '#ff6b6b',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isAr ? 'تسجيل الخروج من الحساب' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: EDIT PROFILE (PERMITTED FIELDS & SECURITY OTP)  */}
      {/* ======================================================== */}
      {isEditModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-primary, #0f1015)', border: '1px solid var(--border-color)', borderRadius: '16px', maxWidth: '540px', width: '100%', padding: '1.75rem', direction: isAr ? 'rtl' : 'ltr', boxShadow: '0 25px 70px rgba(0,0,0,0.85)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent-gold)', fontWeight: 800 }}>
                ✏️ {isAr ? 'تعديل البيانات الشخصية' : 'Edit Profile'}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Sub-Tabs: Info vs Security */}
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                type="button"
                onClick={() => setEditModalTab('info')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: editModalTab === 'info' ? 'var(--accent-gold)' : 'transparent',
                  color: editModalTab === 'info' ? '#000000' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: '0.2s'
                }}
              >
                👤 {isAr ? 'البيانات الشخصية والصورة' : 'Personal & Photo'}
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('security')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: editModalTab === 'security' ? 'var(--accent-gold)' : 'transparent',
                  color: editModalTab === 'security' ? '#000000' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: '0.2s'
                }}
              >
                🔐 {isAr ? 'تغيير البريد أو كلمة المرور (OTP)' : 'Security & Credentials (OTP)'}
              </button>
            </div>

            {/* TAB 1: General Personal Info & Avatar Photo */}
            {editModalTab === 'info' ? (
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {isAr ? 'الاسم الكامل:' : 'Full Name:'}
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    required
                    minLength={3}
                    maxLength={100}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {isAr ? 'رقم الهاتف المحمول:' : 'Mobile Phone:'}
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Avatar Section: Upload from Device & Crop + Direct URL */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: '10px', padding: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', color: 'var(--accent-gold)', fontWeight: 700, marginBottom: '10px' }}>
                    📷 {isAr ? 'الصورة الشخصية (الملف الشخصي):' : 'Profile Picture:'}
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: 'rgba(226, 183, 20, 0.15)',
                      border: '2px solid var(--accent-gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {editAvatarUrl ? (
                        <img src={editAvatarUrl} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                          {(editFullName || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleAvatarFileSelect}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(226, 183, 20, 0.15)',
                          border: '1px solid rgba(226, 183, 20, 0.4)',
                          color: 'var(--accent-gold)',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          width: 'fit-content'
                        }}
                      >
                        <Upload size={14} />
                        {isAr ? 'رفع صورة وقصها من الجهاز' : 'Upload & Crop Image'}
                      </button>

                      {editAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setEditAvatarUrl('')}
                          style={{
                            padding: '4px 8px',
                            background: 'none',
                            border: 'none',
                            color: '#ff6b6b',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            width: 'fit-content'
                          }}
                        >
                          <Trash2 size={12} />
                          {isAr ? 'إزالة الصورة الحالية' : 'Remove picture'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {isAr ? 'أو أدخل رابط الصورة مباشرة (URL):' : 'Or paste image URL:'}
                    </label>
                    <input
                      type="url"
                      value={editAvatarUrl}
                      onChange={e => setEditAvatarUrl(e.target.value)}
                      placeholder="https://..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Locked note in edit form */}
                <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(226, 183, 20, 0.08)', border: '1px dashed rgba(226, 183, 20, 0.3)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  🔒 {isAr ? 'الرقم القومي وتاريخ الميلاد والنوع وحالة العضوية حقول مقفلة ومحمية أمنياً.' : 'Identity fields (National ID, DOB, Gender) are locked.'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    style={{ padding: '10px 18px', borderRadius: '6px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    style={{ padding: '10px 22px', borderRadius: '6px', backgroundColor: 'var(--accent-gold)', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                  >
                    {isSavingProfile ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات' : 'Save Changes')}
                  </button>
                </div>
              </form>
            ) : (
              /* TAB 2: Security Credentials (Email & Password with OTP) */
              <form onSubmit={handleVerifySecurityChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Switcher: Email vs Password */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => { setSecurityChangeType('EMAIL'); setOtpSentNotice(null); setSecurityFeedback(null); }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${securityChangeType === 'EMAIL' ? 'var(--accent-gold)' : 'var(--border-color)'}`,
                      background: securityChangeType === 'EMAIL' ? 'rgba(226, 183, 20, 0.15)' : 'transparent',
                      color: securityChangeType === 'EMAIL' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer'
                    }}
                  >
                    ✉️ {isAr ? 'تغيير البريد الإلكتروني' : 'Change Email'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSecurityChangeType('PASSWORD'); setOtpSentNotice(null); setSecurityFeedback(null); }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${securityChangeType === 'PASSWORD' ? 'var(--accent-gold)' : 'var(--border-color)'}`,
                      background: securityChangeType === 'PASSWORD' ? 'rgba(226, 183, 20, 0.15)' : 'transparent',
                      color: securityChangeType === 'PASSWORD' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer'
                    }}
                  >
                    🔑 {isAr ? 'تغيير كلمة المرور' : 'Change Password'}
                  </button>
                </div>

                {securityChangeType === 'EMAIL' ? (
                  <>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block' }}>{isAr ? 'البريد الإلكتروني الحالي المسجل:' : 'Current Email:'}</span>
                      <strong style={{ fontSize: '0.92rem', color: '#ffffff' }}>{profileData?.email || initialUser?.email}</strong>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        {isAr ? 'البريد الإلكتروني الجديد:' : 'New Email Address:'}
                      </label>
                      <input
                        type="email"
                        required
                        value={newEmailInput}
                        onChange={e => setNewEmailInput(e.target.value)}
                        placeholder="new-email@example.com"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        {isAr ? 'كلمة المرور الجديدة (8 أحرف على الأقل):' : 'New Password (min 8 chars):'}
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPasswordInput}
                        onChange={e => setNewPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        {isAr ? 'تأكيد كلمة المرور الجديدة:' : 'Confirm New Password:'}
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={confirmPasswordInput}
                        onChange={e => setConfirmPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </>
                )}

                {/* Step 1: Send OTP Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(226, 183, 20, 0.05)', padding: '12px 14px', borderRadius: '8px', border: '1px dashed rgba(226, 183, 20, 0.3)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {isAr ? 'يتطلب التعديل إرسال كود تحقق أمني لبريدك الإلكتروني الحالي' : 'Requires security OTP sent to current email'}
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestSecurityOtp}
                    disabled={isSendingOtp}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      background: 'var(--accent-gold)',
                      color: '#000',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      border: 'none',
                      cursor: isSendingOtp ? 'not-allowed' : 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {isSendingOtp ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال كود التحقق 📩' : 'Send OTP 📩')}
                  </button>
                </div>

                {otpSentNotice && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(46, 204, 113, 0.12)', border: '1px solid #2ecc71', color: '#2ecc71', fontSize: '0.84rem', fontWeight: 600 }}>
                    ✓ {otpSentNotice}
                  </div>
                )}

                {/* Step 2: OTP Input & Final Submit */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {isAr ? 'أدخل رمز التحقق (OTP) المكوّن من 6 أرقام:' : 'Enter 6-digit OTP:'}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={securityOtpInput}
                    onChange={e => setSecurityOtpInput(e.target.value.replace(/\D/g, ''))}
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--accent-gold)', color: '#ffffff', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '6px', boxSizing: 'border-box', fontFamily: 'monospace' }}
                  />
                </div>

                {securityFeedback && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: securityFeedback.type === 'success' ? 'rgba(46, 204, 113, 0.12)' : 'rgba(231, 76, 60, 0.12)',
                    border: securityFeedback.type === 'success' ? '1px solid #2ecc71' : '1px solid #e74c3c',
                    color: securityFeedback.type === 'success' ? '#2ecc71' : '#ff6b6b',
                    fontSize: '0.84rem'
                  }}>
                    {securityFeedback.message}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    style={{ padding: '10px 18px', borderRadius: '6px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    {isAr ? 'إغلاق' : 'Close'}
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingSecurity || !securityOtpInput.trim()}
                    style={{
                      padding: '10px 22px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--accent-gold)',
                      color: '#000',
                      fontWeight: 700,
                      border: 'none',
                      cursor: isVerifyingSecurity || !securityOtpInput.trim() ? 'not-allowed' : 'pointer',
                      opacity: !securityOtpInput.trim() ? 0.6 : 1
                    }}
                  >
                    {isVerifyingSecurity ? (isAr ? 'جاري التحقق والتحديث...' : 'Verifying...') : (isAr ? 'تأكيد التحديث عبر OTP' : 'Confirm & Update')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: REQUEST OFFICIAL IDENTITY CORRECTION            */}
      {/* ======================================================== */}
      {isCorrectionModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-primary, #0f1015)', border: '1px solid var(--border-color)', borderRadius: '14px', maxWidth: '520px', width: '100%', padding: '1.75rem', direction: isAr ? 'rtl' : 'ltr', boxShadow: '0 20px 60px rgba(0,0,0,0.85)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent-gold)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} />
                {isAr ? 'طلب تصحيح بيانات هوية مقفلة' : 'Official Identity Correction Request'}
              </h3>
              <button onClick={() => setIsCorrectionModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {correctionFeedback ? (
              <div style={{
                background: correctionFeedback.type === 'success' ? 'rgba(46, 204, 113, 0.12)' : 'rgba(231, 76, 60, 0.12)',
                border: correctionFeedback.type === 'success' ? '1px solid #2ecc71' : '1px solid #e74c3c',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>
                  {correctionFeedback.type === 'success' ? '✅' : '⚠️'}
                </div>
                <h4 style={{ margin: '0 0 6px 0', color: correctionFeedback.type === 'success' ? '#2ecc71' : '#e74c3c' }}>
                  {correctionFeedback.type === 'success' ? (isAr ? 'تم استلام طلبك بنجاح' : 'Request Submitted') : (isAr ? 'تعذر الإرسال' : 'Submission Error')}
                </h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.86rem', color: '#ffffff', lineHeight: '1.6' }}>
                  {correctionFeedback.message}
                </p>
                {correctionFeedback.code && (
                  <p style={{ margin: '0 0 14px 0', fontSize: '0.82rem', color: 'var(--accent-gold)', fontWeight: 700 }}>
                    {isAr ? `الرقم المرجعي للمتابعة: ${correctionFeedback.code}` : `Reference Code: ${correctionFeedback.code}`}
                  </p>
                )}
                <button
                  onClick={() => setIsCorrectionModalOpen(false)}
                  style={{ padding: '8px 20px', borderRadius: '6px', backgroundColor: 'var(--accent-gold)', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitCorrection} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                  {isAr
                    ? 'يتم فحص ومراجعة طلبات تصحيح الهوية المقفلة بمعرفة أمانة الكنيسة لضمان مطابقتها مع بطاقة الرقم القومي الرسمية.'
                    : 'Correction requests for locked fields are reviewed by church administration against official documents.'}
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {isAr ? 'الحقل المراد تصحيحه:' : 'Field requiring correction:'}
                  </label>
                  <select
                    value={correctionField}
                    onChange={e => setCorrectionField(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  >
                    <option value="nationalId">{isAr ? 'الرقم القومي (National ID)' : 'National ID'}</option>
                    <option value="fullName">{isAr ? 'الاسم بالكامل (Full Name)' : 'Full Name'}</option>
                    <option value="dateOfBirth">{isAr ? 'تاريخ الميلاد (Date of Birth)' : 'Date of Birth'}</option>
                    <option value="gender">{isAr ? 'النوع (Gender)' : 'Gender'}</option>
                    <option value="other">{isAr ? 'بيانات أخرى بالملف' : 'Other'}</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {isAr ? 'القيمة الصحيحة المطلوبة:' : 'Requested Correct Value:'}
                  </label>
                  <input
                    type="text"
                    value={correctionRequestedValue}
                    onChange={e => setCorrectionRequestedValue(e.target.value)}
                    required
                    placeholder={isAr ? 'أدخل القيمة الصحيحة هنا...' : 'Enter correct value...'}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {isAr ? 'سبب التعديل والتوضيح للأمانة (10 أحرف على الأقل):' : 'Reason / Explanation (min 10 chars):'}
                  </label>
                  <textarea
                    value={correctionReason}
                    onChange={e => setCorrectionReason(e.target.value)}
                    required
                    minLength={10}
                    rows={3}
                    placeholder={isAr ? 'اشرح سبب التعديل بالتفصيل، مثلاً: خطأ مطبعي في أحد أرقام الرقم القومي...' : 'Explain the reason for this correction...'}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.88rem', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCorrectionModalOpen(false)}
                    style={{ padding: '10px 18px', borderRadius: '6px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCorrection}
                    style={{ padding: '10px 22px', borderRadius: '6px', backgroundColor: 'var(--accent-gold)', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Send size={15} />
                    {isSubmittingCorrection ? (isAr ? 'جارٍ الإرسال...' : 'Submitting...') : (isAr ? 'إرسال طلب التصحيح' : 'Submit Request')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: VIEW PASS FULL QR DIALOG                        */}
      {/* ======================================================== */}
      {viewingPassQr && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }} onClick={() => setViewingPassQr(null)}>
          <div style={{ maxWidth: '460px', width: '100%', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setViewingPassQr(null)}
              style={{
                position: 'absolute',
                top: '-45px',
                right: isAr ? 'auto' : '0',
                left: isAr ? '0' : 'auto',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#fff',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
            <VipInvitationCard invitation={viewingPassQr} language={language} onCancel={onCancelPass} />
          </div>
        </div>
      )}

      {/* Image Crop Modal for Avatar */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageUrl={cropImageSrc}
        aspectRatioPreset="circle"
        onClose={() => setIsCropModalOpen(false)}
        onCropComplete={handleCropComplete}
      />

    </div>
  );
}
